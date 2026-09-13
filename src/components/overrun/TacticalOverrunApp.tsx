'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, Calendar, Brain, FileText,
  Home, Settings, Bell, User,
  ChevronRight, Activity, Zap, Sparkles
} from 'lucide-react';
import { TacticalDashboard } from './TacticalDashboard';
import { TacticalTimeline } from './TacticalTimeline';
import { TacticalMasteryGrid } from './TacticalMasteryGrid';
import { TacticalYamlImport } from './TacticalYamlImport';
import { TacticalKnowledgeBase } from './TacticalKnowledgeBase';
import { TacticalCalendar } from './TacticalCalendar';
import { TutorialModal } from './TutorialModal';

type Tab = 'dashboard' | 'timeline' | 'mastery' | 'import' | 'knowledge';

interface TabConfig {
  id: Tab;
  label: string;
  icon: any;
  description: string;
}

const TABS: TabConfig[] = [
  { id: 'dashboard', label: 'Command', icon: Home, description: 'Overview & quick actions' },
  { id: 'timeline', label: 'Timeline', icon: Calendar, description: 'Schedule & missions' },
  { id: 'mastery', label: 'Intelligence', icon: Brain, description: 'Progress & mastery tracking' },
  { id: 'import', label: 'Import', icon: FileText, description: 'YAML data import' },
  { id: 'knowledge', label: 'Knowledge', icon: Activity, description: 'Base & resources' }
];

export function TacticalOverrunApp() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notifications, setNotifications] = useState(3);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  useEffect(() => {
    // Open tutorial automatically for first time visitors
    const seen = localStorage.getItem('overrun_tutorial_seen');
    if (!seen) {
      setIsTutorialOpen(true);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleNav = (e: any) => {
      if (e.detail && ['dashboard', 'timeline', 'mastery', 'import', 'knowledge'].includes(e.detail)) {
        setActiveTab(e.detail as Tab);
      }
    };
    window.addEventListener('overrun-navigate', handleNav);
    return () => window.removeEventListener('overrun-navigate', handleNav);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <TacticalDashboard />;
      case 'timeline':
        return (
          <div className="space-y-6">
            <TacticalCalendar />
            <TacticalTimeline />
          </div>
        );
      case 'mastery':
        return <TacticalMasteryGrid />;
      case 'import':
        return <TacticalYamlImport onNavigate={setActiveTab} />;
      case 'knowledge':
        return <TacticalKnowledgeBase />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-tactical-deep text-tactical font-sans">
      {/* Top Navigation Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-tactical-surface/90 backdrop-blur-lg border-b border-tactical-border">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-14 md:h-16">
            {/* Logo - Responsive sizing */}
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-br from-tactical-primary to-tactical-purple flex items-center justify-center">
                <Target className="w-4 h-4 md:w-6 md:h-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-base md:text-xl font-bold text-tactical tracking-tight">OVERRUN</h1>
                <p className="text-[10px] md:text-xs text-tactical-muted hidden lg:block">Tactical Command Center</p>
              </div>
            </div>

            {/* Center Navigation - Desktop only */}
            <div className="hidden md:flex items-center gap-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 md:px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                      isActive
                        ? 'bg-tactical-primary/20 text-tactical-primary'
                        : 'text-tactical-muted hover:text-tactical hover:bg-tactical-deep/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs md:text-sm font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Right Actions - Responsive */}
            <div className="flex items-center gap-2 md:gap-4">
              {/* Tutorial Button */}
              <button
                onClick={() => setIsTutorialOpen(true)}
                className="px-2.5 py-1.5 md:px-3.5 md:py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tutorial</span>
              </button>

              {/* Notifications - Hidden on smallest screens */}
              <button className="relative p-1.5 md:p-2 rounded-lg hover:bg-tactical-deep/50 transition-all hidden sm:block">
                <Bell className="w-4 h-4 md:w-5 md:h-5 text-tactical-muted" />
                {notifications > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-tactical-danger rounded-full text-[10px] md:text-xs text-white flex items-center justify-center font-medium">
                    {notifications}
                  </span>
                )}
              </button>

              {/* Settings - Hidden on mobile */}
              <button className="p-2 rounded-lg hover:bg-tactical-deep/50 transition-all hidden sm:block">
                <Settings className="w-5 h-5 text-tactical-muted" />
              </button>

              {/* User - Smaller on mobile */}
              <button className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-br from-tactical-purple to-tactical-primary flex items-center justify-center">
                <User className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation - Improved responsiveness */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-tactical-surface/95 backdrop-blur-lg border-t border-tactical-border safe-area-inset-bottom">
        <div className="flex items-center justify-around py-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center p-1.5 rounded-lg transition-all relative ${
                  isActive
                    ? 'text-tactical-primary bg-tactical-primary/10'
                    : 'text-tactical-muted hover:text-tactical hover:bg-tactical-deep/30'
                }`}
              >
                {isActive && (
                  <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-tactical-primary rounded-full" />
                )}
                <Icon className="w-5 h-5" />
                <span className="text-[9px] font-medium mt-0.5">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-16 md:pt-20 pb-20 md:pb-8 px-3 md:px-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="mb-4 md:mb-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-tactical">
                  {TABS.find(tab => tab.id === activeTab)?.label}
                </h2>
                <p className="text-tactical-muted text-xs md:text-sm mt-1">
                  {TABS.find(tab => tab.id === activeTab)?.description}
                </p>
              </div>

              {/* Quick Stats - Responsive */}
              <div className="hidden md:flex items-center gap-4 md:gap-6">
                <div className="text-right">
                  <p className="text-[10px] md:text-xs text-tactical-muted uppercase tracking-wider">System Status</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-tactical-success animate-pulse" />
                    <p className="text-sm font-medium text-tactical-success">Online</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-tactical-muted uppercase tracking-wider">Mission Time</p>
                  <p className="text-sm font-mono text-tactical">
                    {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Quick Action FAB (Mobile) */}
      <div className="md:hidden fixed bottom-20 right-4 z-40">
        <button className="w-14 h-14 rounded-full bg-gradient-to-br from-tactical-primary to-tactical-purple flex items-center justify-center shadow-lg shadow-tactical-primary/30">
          <Zap className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* First-Timers Onboarding Tutorial Modal */}
      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        onNavigateTab={(tab) => setActiveTab(tab as Tab)}
      />
    </div>
  );
}