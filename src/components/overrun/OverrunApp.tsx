'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { TimeBankBar } from './TimeBankBar';
import { DaySelector } from './DaySelector';
import { Dropzone } from './Dropzone';
import { Timeline } from './Timeline';
import { EODTerminal } from './EODTerminal';
import { Heatmap } from './Heatmap';
import { KnowledgeLog } from './KnowledgeLog';
import { MemoryBase } from './MemoryBase';
import { ObsidianSyncCard } from './ObsidianSyncCard';
import { playClick, playPop } from '@/engine/sounds';
import { ClipboardList, BarChart3, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { MasteryTracker } from './MasteryTracker';
import { SubjectHierarchyTree } from './SubjectHierarchyTree';
import { YamlImportCard } from './YamlImportCard';
import { CollegeScheduleImporter } from './CollegeScheduleImporter';

type Tab = 'schedule' | 'intel';

export function OverrunApp() {
  const [activeTab, setActiveTab] = useState<Tab>('schedule');
  const [showDropzone, setShowDropzone] = useState(false);
  const [showTimetableImporter, setShowTimetableImporter] = useState(false);
  const loadTasksFromServer = useStore((s) => s.loadTasksFromServer);

  const [isMounted, setIsMounted] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setIsDemo(true);
      useStore.getState().enableDemoMode();
    } else {
      loadTasksFromServer();
    }
  }, [loadTasksFromServer]);

  const handleTabChange = (tab: Tab) => { setActiveTab(tab); playClick(); };

  if (!isMounted) return null; // Prevent hydration mismatch

  return (
    <div className="overrun-root min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b-4 border-black shadow-[0_4px_0px_#000]">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tighter text-black">
                OVERRUN
              </h1>
              <span className="text-[10px] font-mono font-black text-black bg-[#CCFF00] px-2 py-0.5 rounded border-2 border-black shadow-[1.5px_1.5px_0px_#000]">
                v3.0
              </span>
            </div>

            <div className="flex items-center gap-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => handleTabChange('schedule')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black border-3 border-black transition-all ${
                  activeTab === 'schedule'
                    ? 'bg-[#CCFF00] text-black shadow-[3px_3px_0px_#000]'
                    : 'bg-white text-black hover:bg-[#00F0FF] shadow-[2px_2px_0px_#000]'
                }`}
              >
                <ClipboardList className="w-4 h-4 stroke-[3]" />
                <span className="hidden sm:inline">Schedule</span>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => handleTabChange('intel')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black border-3 border-black transition-all ${
                  activeTab === 'intel'
                    ? 'bg-[#00F0FF] text-black shadow-[3px_3px_0px_#000]'
                    : 'bg-white text-black hover:bg-[#CCFF00] shadow-[2px_2px_0px_#000]'
                }`}
              >
                <BarChart3 className="w-4 h-4 stroke-[3]" />
                <span className="hidden sm:inline">Intel & Mastery</span>
              </motion.button>
            </div>
          </div>

          <TimeBankBar />
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6">
        {isDemo && (
          <div className="mb-6 bg-[#FFE600] text-black border-4 border-black p-4 rounded-xl shadow-[4px_4px_0px_#000]">
            <h2 className="text-lg font-black uppercase mb-1 flex items-center gap-2"><AlertTriangle className="w-5 h-5 stroke-[3]"/> Live Demo Mode</h2>
            <p className="text-sm font-bold font-mono">
              You are viewing a generic demo with hardcoded mock data. To use the full version with local file persistence, database support, and your own Obsidian Vault, <a href="https://github.com/arjun1k-dev/overrun" target="_blank" rel="noreferrer" className="underline text-blue-700 hover:text-blue-900">download the original from GitHub</a> and run it locally.
            </p>
          </div>
        )}
        <AnimatePresence mode="wait">
          {activeTab === 'schedule' && (
            <motion.div key="schedule" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.15 }} className="space-y-6">
              <DaySelector />
              <div className="flex gap-2 flex-col sm:flex-row">
                <div className="flex-1">
                  <motion.button whileTap={{ scale: 0.98 }} onClick={() => { setShowDropzone(!showDropzone); setShowTimetableImporter(false); playPop(); }}
                    className="w-full bg-[#CCFF00] text-black py-3 text-sm font-black rounded-xl border-3 border-black shadow-[4px_4px_0px_#000] flex items-center justify-center gap-2 hover:bg-[#00F0FF] transition-all cursor-pointer">
                    {showDropzone ? <ChevronUp className="w-4 h-4 stroke-[3]" /> : <ChevronDown className="w-4 h-4 stroke-[3]" />}
                    {showDropzone ? 'Hide Import Zone' : 'Import AI Schedule'}
                  </motion.button>
                  <AnimatePresence>
                    {showDropzone && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-4 overflow-hidden">
                        <div className="max-card p-5"><Dropzone /></div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                <div className="flex-1">
                  <motion.button whileTap={{ scale: 0.98 }} onClick={() => { setShowTimetableImporter(!showTimetableImporter); setShowDropzone(false); playPop(); }}
                    className="w-full bg-[#FF70A6] text-black py-3 text-sm font-black rounded-xl border-3 border-black shadow-[4px_4px_0px_#000] flex items-center justify-center gap-2 hover:bg-[#FF007F] hover:text-white transition-all cursor-pointer">
                    {showTimetableImporter ? <ChevronUp className="w-4 h-4 stroke-[3]" /> : <ChevronDown className="w-4 h-4 stroke-[3]" />}
                    {showTimetableImporter ? 'Hide Timetable' : 'Import College Timetable'}
                  </motion.button>
                  <AnimatePresence>
                    {showTimetableImporter && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-4 overflow-hidden">
                        <div className="max-card p-5"><CollegeScheduleImporter /></div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div className="max-card p-5"><Timeline /></div>
              <div className="max-card p-5"><EODTerminal /></div>
            </motion.div>
          )}

          {activeTab === 'intel' && (
            <motion.div key="intel" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }} className="space-y-6">
              <YamlImportCard />
              <ObsidianSyncCard />
              <SubjectHierarchyTree />
              <MasteryTracker />
              <div className="max-card p-5"><MemoryBase /></div>
              <div className="max-card p-5"><Heatmap /></div>
              <div className="max-card p-5"><KnowledgeLog /></div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="sticky bottom-0 mt-auto bg-white border-t-3 border-black">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-center">
          <span className="text-[10px] font-mono text-black font-black uppercase tracking-wider">OVERRUN v3.0 — Tactical Time & Knowledge Mastery System</span>
        </div>
      </footer>
    </div>
  );
}
