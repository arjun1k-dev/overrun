'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, ShieldCheck, FolderKanban, Clock, CheckCircle2,
  ChevronRight, ChevronLeft, X, BookOpen, Lock, Terminal, Lightbulb
} from 'lucide-react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: string) => void;
}

export function TutorialModal({ isOpen, onClose, onNavigateTab }: TutorialModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: 'Welcome to OVERRUN Tactical Engine',
      subtitle: 'First-Timer Quickstart & System Guide',
      icon: Sparkles,
      color: 'from-amber-500 to-orange-500',
      badge: 'Step 1 of 4: Overview',
      content: (
        <div className="space-y-4">
          <p className="text-tactical text-sm leading-relaxed">
            <strong className="text-amber-400">OVERRUN</strong> is a high-yield tactical scheduling and execution engine designed to eliminate distraction, enforce structured deep work, and track daily output without friction.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <div className="p-3 rounded-lg bg-tactical-surface border border-tactical-border/60 hover:border-amber-500/40 transition-colors">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Stream A: Deep Work
              </div>
              <p className="text-xs text-tactical-muted">High-priority core coding, algorithms, and primary builds.</p>
            </div>
            <div className="p-3 rounded-lg bg-tactical-surface border border-tactical-border/60 hover:border-blue-500/40 transition-colors">
              <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                Stream B: Vault Sync
              </div>
              <p className="text-xs text-tactical-muted">Knowledge curation, markdown vault reviews, & system architecture.</p>
            </div>
            <div className="p-3 rounded-lg bg-tactical-surface border border-tactical-border/60 hover:border-purple-500/40 transition-colors">
              <div className="flex items-center gap-2 text-purple-400 text-xs font-semibold uppercase tracking-wider mb-1">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                Stream C: Routine
              </div>
              <p className="text-xs text-tactical-muted">Fixed obligations, academic submissions, and travel blocks.</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '100% Client-Side & Zero-Leak Data Privacy',
      subtitle: 'Your plans and knowledge stay private to you',
      icon: ShieldCheck,
      color: 'from-emerald-500 to-teal-500',
      badge: 'Step 2 of 4: Data Security',
      content: (
        <div className="space-y-4">
          <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
            <Lock className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-emerald-300">Complete Privacy Safeguard</h4>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                OVERRUN operates strictly in your local browser environment. No personal notes, private roadmaps, or custom task logs are ever transmitted to any remote cloud server or baked into static deployment bundles.
              </p>
            </div>
          </div>
          <div className="space-y-2 text-xs text-tactical-muted">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Local Storage & IndexedDB persistence on your machine</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>File System Access API (`window.showDirectoryPicker`) for Obsidian vault sync</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Zero server-side seeding or public data disclosure</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Connect Your Local Knowledge Vault',
      subtitle: 'Seamlessly link Obsidian or local Markdown notes',
      icon: FolderKanban,
      color: 'from-blue-500 to-cyan-500',
      badge: 'Step 3 of 4: Knowledge Base',
      content: (
        <div className="space-y-4">
          <p className="text-tactical text-sm leading-relaxed">
            Connect your local folder containing your markdown files (`.md`) or YAML schemas to explore your personal knowledge graph locally.
          </p>
          <div className="p-3 rounded-lg bg-tactical-surface border border-tactical-border/70 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                1
              </div>
              <span className="text-xs text-tactical">Navigate to the <strong>Knowledge Tab</strong> in the top menu.</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <span className="text-xs text-tactical">Click <strong>Connect Local Vault</strong> and grant browser folder permissions.</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                3
              </div>
              <span className="text-xs text-tactical">Instant search, markdown viewing, and topic tracking right inside OVERRUN!</span>
            </div>
          </div>
          {onNavigateTab && (
            <button
              onClick={() => {
                onNavigateTab('knowledge');
                onClose();
              }}
              className="w-full py-2 px-4 rounded-lg bg-blue-600/20 border border-blue-500/40 text-blue-400 hover:bg-blue-600/30 text-xs font-semibold transition-all flex items-center justify-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              Go to Knowledge Tab Now
            </button>
          )}
        </div>
      ),
    },
    {
      title: 'Tactical Timeline & Time Bank Engine',
      subtitle: 'Schedule missions and audit execution',
      icon: Clock,
      color: 'from-purple-500 to-indigo-500',
      badge: 'Step 4 of 4: Execution',
      content: (
        <div className="space-y-4">
          <p className="text-tactical text-sm leading-relaxed">
            Keep track of every hour in your day with real-time gap analysis and collision detection.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-tactical-surface border border-tactical-border/60">
              <h5 className="text-xs font-semibold text-purple-400 mb-1 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" /> Time Bank Audit
              </h5>
              <p className="text-[11px] text-tactical-muted">
                Measures planned focus hours vs actual completion. Unfinished tasks carry forward to keep you accountable.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-tactical-surface border border-tactical-border/60">
              <h5 className="text-xs font-semibold text-amber-400 mb-1 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5" /> Collision Warning
              </h5>
              <p className="text-[11px] text-tactical-muted">
                Prevents double-booking over travel blocks or fixed obligations with automated gap detection.
              </p>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200">
            💡 <strong>Pro Tip:</strong> Click <strong>"Reset to Tutorial Schedule"</strong> anytime in the Timeline tab to start with clean generic tutorial tasks.
          </div>
        </div>
      ),
    },
  ];

  const current = steps[currentStep];
  const StepIcon = current.icon;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      localStorage.setItem('overrun_tutorial_seen', 'true');
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-xl bg-tactical-deep border border-tactical-border/80 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className={`p-5 bg-gradient-to-r ${current.color} relative text-white`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest bg-black/30 px-2.5 py-1 rounded-full backdrop-blur-sm">
              {current.badge}
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0">
              <StepIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight leading-tight">{current.title}</h3>
              <p className="text-xs text-white/80 mt-0.5">{current.subtitle}</p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 md:p-6 space-y-4">
          {current.content}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 bg-tactical-surface/80 border-t border-tactical-border/60 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep ? 'w-6 bg-tactical-primary' : 'w-2 bg-tactical-border hover:bg-tactical-muted'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="px-3 py-1.5 rounded-lg border border-tactical-border text-tactical-muted hover:text-tactical hover:bg-tactical-deep text-xs font-medium transition-all flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-4 py-1.5 rounded-lg bg-tactical-primary text-black font-semibold text-xs hover:opacity-90 transition-all flex items-center gap-1 shadow-md shadow-tactical-primary/20"
            >
              {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
